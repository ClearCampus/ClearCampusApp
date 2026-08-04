import {
  Accordion,
  Button,
  ButtonGroup,
  cn,
  Dropdown,
  Slider,
} from "@heroui/react";
import { ChevronDown, ListFilterIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface FiltersProps {
  className?: string;
}

interface MultiSelectFilterProps {
  options: string[];
  selection: number[];
  onSelectionChanged: (indices: number[]) => void;
}

function MultiSelectFilter(props: MultiSelectFilterProps) {
  const [selected, setSelected] = useState<number[]>(props.selection);

  useEffect(() => {
    props.onSelectionChanged(selected);
  }, [selected]);

  return (
    <ButtonGroup orientation="vertical" className={"w-full"}>
      {props.options.map((option, index) => (
        <Button
          key={option}
          variant={selected.includes(index) ? "primary" : "outline"}
          className={"w-full"}
          onPress={() => {
            if (selected.includes(index)) {
              setSelected(selected.filter((value) => value != index));
            } else {
              setSelected([...selected, index]);
            }
          }}
        >
          {index > 0 && <ButtonGroup.Separator />}
          {option}
        </Button>
      ))}
    </ButtonGroup>
  );
}

export default function Filters({ className }: FiltersProps) {
  const [timeCommitment, setTimeCommitment] = useState<number[]>([0, 1, 2]);
  const [feeCost, setFeeCost] = useState<number>(500);
  const [meetingType, setMeetingType] = useState<number[]>([0, 1, 2, 3]);

  const filters = [
    {
      name: "Time Commitment",
      content: (
        <MultiSelectFilter
          options={["Low", "Medium", "High"]}
          selection={timeCommitment}
          onSelectionChanged={(selection: number[]) =>
            setTimeCommitment(selection)
          }
        />
      ),
    },
    {
      name: "Fee Cost",
      content: (
        <Slider
          className="w-full max-w-xs"
          defaultValue={feeCost}
          maxValue={500}
          step={10}
          aria-label="fee cost"
          onChange={(cost) => setFeeCost(cost as number)}
        >
          <Slider.Output>
            {({ state }) =>
              state.getThumbValue(0) === state.getThumbMaxValue(0)
                ? "$500+"
                : `$${state.getThumbValue(0)}`
            }
          </Slider.Output>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ),
    },
    {
      name: "Meeting Type",
      content: (
        <MultiSelectFilter
          options={["Project", "Volunteering", "Learning Series", "Mentorship"]}
          selection={meetingType}
          onSelectionChanged={(selection: number[]) =>
            setMeetingType(selection)
          }
        />
      ),
    },
  ];

  return (
    <Dropdown>
      <Button
        aria-label="Filters"
        variant="outline"
        size="lg"
        className={cn("px-4", className)}
        onPress={() => {
          console.log(timeCommitment);
        }}
      >
        <ListFilterIcon />
        Filters
      </Button>
      <Dropdown.Popover className="max-w-[92vw] sm:max-w-sm">
        <Accordion className="w-[min(22rem,90vw)] max-w-md">
          {filters.map((filter) => (
            <Accordion.Item key={filter.name}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  {filter.name}
                  <Accordion.Indicator>
                    <ChevronDown />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>{filter.content}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Dropdown.Popover>
    </Dropdown>
  );
}
